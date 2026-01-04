export const JWT_SECRET = process.env.JWT_SECRET ?? 'your-secret-key';

export const JWT_EXPIRES_IN: number =
  Number(process.env.JWT_EXPIRES_IN) || 60 * 60 * 24; // 86400
