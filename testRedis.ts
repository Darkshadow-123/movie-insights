import { redis } from './app/lib/redis';

async function run() {
  await redis.hset('test-hash', {a: '1', b: '2'});
  const res = await redis.hmget('test-hash', 'a', 'b');
  console.log('Result type:', Array.isArray(res) ? 'Array' : 'Object', res);
}

run();
