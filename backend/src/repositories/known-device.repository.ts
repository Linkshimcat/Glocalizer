import { supabase } from '../config/supabase.js';
import { unwrapVoid } from '../utils/db-result.js';

/** 처음 보는 브라우저면 true. 동일 브라우저의 재로그인은 unique 제약으로 false를 돌려준다. */
export async function rememberDevice(userId: string, deviceId: string): Promise<boolean> {
  const { error } = await supabase.from('user_known_devices').insert({ user_id: userId, device_id: deviceId });
  if (error && (error as { code?: string }).code === '23505') return false;
  unwrapVoid({ error }, '브라우저 확인에 실패했습니다.');
  return true;
}
