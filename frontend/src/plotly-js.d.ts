declare module "plotly.js-dist-min" {
  type Node = HTMLElement;
  const Plotly: {
    react(node: Node, data: Record<string, unknown>[], layout: Record<string, unknown>, config: Record<string, unknown>): Promise<void>;
    purge(node: Node): void;
    Plots: { resize(node: Node): void };
  };
  export default Plotly;
}
