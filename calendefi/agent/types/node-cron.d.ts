declare module "node-cron" {
  interface ScheduledTask {
    start: () => void;
    stop: () => void;
  }
  export function schedule(expression: string, func: () => void): ScheduledTask;
  const _default: { schedule: typeof schedule };
  export default _default;
}


