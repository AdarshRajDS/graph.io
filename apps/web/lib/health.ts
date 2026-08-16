export type HealthPayload = {
  status: "ok";
};

export function healthPayload(): HealthPayload {
  return { status: "ok" };
}
