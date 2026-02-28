import { getKaizenStatusSnapshot } from "../../runtime/snapshot.js";

export async function statusSnapshot() {
  return getKaizenStatusSnapshot();
}
