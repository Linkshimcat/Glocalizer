import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_HEADER = 'x-request-id';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header(REQUEST_ID_HEADER);
  req.id = incoming && incoming.length > 0 ? incoming : `req_${randomUUID()}`;
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
}
