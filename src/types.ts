export type RecordLike = Record<string, any>;
export type AutoGraphDeps = readonly string[];
export type AutoGraphFn<Input extends RecordLike = RecordLike, Output = any> = (
  args: Input
) => Output;

export interface AutoGraphTask {
  deps: AutoGraphDeps;
  fn: AutoGraphFn;
}
