import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
process.env.AUTH_RATE_LIMIT_MAX_REQUESTS='2';
process.env.PASSWORD_RATE_LIMIT_MAX_REQUESTS='2';
const { authEntryRateLimit, passwordRateLimit }=await import('../../src/middleware/auth-rate-limit.middleware.js');
const app=express();
app.use((req,_res,next)=>{req.id='test-request';req.auth={sub:req.header('x-test-user')??'user-a'};next();});
app.post('/login',authEntryRateLimit,(_req,res)=>res.sendStatus(200));
app.post('/password',passwordRateLimit,(_req,res)=>res.sendStatus(200));
describe('authentication request limits',()=>{
 it('limits login attempts and returns the existing error shape and retry header',async()=>{
  expect((await request(app).post('/login')).status).toBe(200);
  expect((await request(app).post('/login')).status).toBe(200);
  const response=await request(app).post('/login');
  expect(response.status).toBe(429);expect(response.body.error.code).toBe('RATE_LIMITED');expect(response.headers['retry-after']).toBeTruthy();
 });
 it('limits password changes by account instead of sharing one user counter',async()=>{
  for(let i=0;i<2;i++) expect((await request(app).post('/password')).status).toBe(200);
  expect((await request(app).post('/password')).status).toBe(429);
  expect((await request(app).post('/password').set('x-test-user','user-b')).status).toBe(200);
 });
});
