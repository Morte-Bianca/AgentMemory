export interface EmbeddingProvider {
  readonly modelName: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}
