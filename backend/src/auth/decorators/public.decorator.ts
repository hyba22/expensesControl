import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Routes are protected by default; this opts a route out of the JWT check.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
