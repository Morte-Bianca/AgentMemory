async function main() {
  const factory = await ethers.getContractFactory('AgentMemoryCommitments');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('AgentMemoryCommitments deployed to:', address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
