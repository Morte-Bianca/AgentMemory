use sha2::{Digest, Sha256};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::{clock::Clock, rent::ID as RENT_SYSVAR_ID, Sysvar},
};
use thiserror::Error;

const SEED_PREFIX: &[u8] = b"am1";

#[derive(Error, Debug, Copy, Clone)]
pub enum CommitmentError {
    #[error("Invalid instruction data")]
    InvalidInstruction = 0x01,
    #[error("Invalid PDA")]
    InvalidPda = 0x02,
    #[error("Commitment already exists")]
    AlreadyCommitted = 0x03,
    #[error("Account not writable")]
    NotWritable = 0x04,
    #[error("Payer must sign")]
    PayerMustSign = 0x05,
    #[error("Missing sysvar")]
    MissingSysvar = 0x06,
}

impl From<CommitmentError> for ProgramError {
    fn from(e: CommitmentError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

#[repr(C)]
#[derive(Clone, Copy)]
pub struct CommitmentAccount {
    pub v: u8,
    pub content_hash: [u8; 32],
    pub cid_hash: [u8; 32],
    pub committer: [u8; 32],
    pub slot: u64,
    pub timestamp: i64,
}

impl CommitmentAccount {
    pub const SIZE: usize = 1 + 32 + 32 + 32 + 8 + 8;

    pub fn pack_into_slice(&self, dst: &mut [u8]) {
        dst[0] = self.v;
        dst[1..33].copy_from_slice(&self.content_hash);
        dst[33..65].copy_from_slice(&self.cid_hash);
        dst[65..97].copy_from_slice(&self.committer);
        dst[97..105].copy_from_slice(&self.slot.to_le_bytes());
        dst[105..113].copy_from_slice(&self.timestamp.to_le_bytes());
    }

    pub fn unpack_from_slice(src: &[u8]) -> Result<Self, ProgramError> {
        if src.len() < Self::SIZE {
            return Err(CommitmentError::InvalidInstruction.into());
        }
        let mut content_hash = [0u8; 32];
        let mut cid_hash = [0u8; 32];
        let mut committer = [0u8; 32];
        content_hash.copy_from_slice(&src[1..33]);
        cid_hash.copy_from_slice(&src[33..65]);
        committer.copy_from_slice(&src[65..97]);
        let mut slot_bytes = [0u8; 8];
        slot_bytes.copy_from_slice(&src[97..105]);
        let slot = u64::from_le_bytes(slot_bytes);
        let mut ts_bytes = [0u8; 8];
        ts_bytes.copy_from_slice(&src[105..113]);
        let timestamp = i64::from_le_bytes(ts_bytes);

        Ok(Self {
            v: src[0],
            content_hash,
            cid_hash,
            committer,
            slot,
            timestamp,
        })
    }
}

/// Instruction format:
/// - 4 bytes: tag "AMCM"
/// - 1 byte: version = 1
/// - 32 bytes: agent_id_hash = sha256(utf8(agentId))
/// - 32 bytes: memory_id_hash = sha256(utf8(memoryId))
/// - 32 bytes: content_hash = sha256(canonical plaintext JSON) (computed off-chain)
/// - 32 bytes: cid_hash = sha256(utf8(cid)) (computed off-chain)
fn parse_commit_ix(data: &[u8]) -> Result<([u8; 32], [u8; 32], [u8; 32], [u8; 32]), ProgramError> {
    if data.len() != 4 + 1 + 32 + 32 + 32 + 32 {
        return Err(CommitmentError::InvalidInstruction.into());
    }
    if &data[0..4] != b"AMCM" {
        return Err(CommitmentError::InvalidInstruction.into());
    }
    if data[4] != 1 {
        return Err(CommitmentError::InvalidInstruction.into());
    }

    let mut agent = [0u8; 32];
    let mut memory = [0u8; 32];
    let mut content = [0u8; 32];
    let mut cid = [0u8; 32];

    agent.copy_from_slice(&data[5..37]);
    memory.copy_from_slice(&data[37..69]);
    content.copy_from_slice(&data[69..101]);
    cid.copy_from_slice(&data[101..133]);

    Ok((agent, memory, content, cid))
}

fn derive_pda(program_id: &Pubkey, agent_hash: &[u8; 32], memory_hash: &[u8; 32]) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[SEED_PREFIX, agent_hash.as_ref(), memory_hash.as_ref()], program_id)
}

entrypoint!(process_instruction);

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], instruction_data: &[u8]) -> ProgramResult {
    let (agent_hash, memory_hash, content_hash, cid_hash) = parse_commit_ix(instruction_data)?;

    let account_info_iter = &mut accounts.iter();
    let payer = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent_sysvar = next_account_info(account_info_iter)?;
    let clock_sysvar = next_account_info(account_info_iter)?;

    if !payer.is_signer {
        return Err(CommitmentError::PayerMustSign.into());
    }

    if *rent_sysvar.key != RENT_SYSVAR_ID {
        return Err(CommitmentError::MissingSysvar.into());
    }

    let (expected_pda, bump) = derive_pda(program_id, &agent_hash, &memory_hash);
    if expected_pda != *pda_account.key {
        return Err(CommitmentError::InvalidPda.into());
    }

    if !pda_account.is_writable {
        return Err(CommitmentError::NotWritable.into());
    }

    // If already initialized, prevent changes.
    if pda_account.owner == program_id && pda_account.data_len() >= CommitmentAccount::SIZE {
        let data = pda_account.try_borrow_data()?;
        // treat any non-zero version as initialized
        if data.get(0).copied().unwrap_or(0) != 0 {
            return Err(CommitmentError::AlreadyCommitted.into());
        }
    }

    // Create account if needed.
    if pda_account.owner != program_id {
        let rent = Rent::from_account_info(rent_sysvar)?;
        let lamports = rent.minimum_balance(CommitmentAccount::SIZE);

        let create_ix = system_instruction::create_account(
            payer.key,
            pda_account.key,
            lamports,
            CommitmentAccount::SIZE as u64,
            program_id,
        );

        invoke_signed(
            &create_ix,
            &[payer.clone(), pda_account.clone(), system_program.clone()],
            &[&[SEED_PREFIX, agent_hash.as_ref(), memory_hash.as_ref(), &[bump]]],
        )?;
    }

    let clock = Clock::from_account_info(clock_sysvar)?;

    let commitment = CommitmentAccount {
        v: 1,
        content_hash,
        cid_hash,
        committer: payer.key.to_bytes(),
        slot: clock.slot,
        timestamp: clock.unix_timestamp,
    };

    {
        let mut data = pda_account.try_borrow_mut_data()?;
        if data.len() < CommitmentAccount::SIZE {
            return Err(CommitmentError::InvalidInstruction.into());
        }
        commitment.pack_into_slice(&mut data[..CommitmentAccount::SIZE]);
    }

    msg!("AMCM: committed");

    Ok(())
}

/// Utility used off-chain as well.
pub fn sha256_bytes(input: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(input);
    let out = hasher.finalize();
    let mut arr = [0u8; 32];
    arr.copy_from_slice(&out);
    arr
}
