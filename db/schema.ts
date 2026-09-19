import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const watches=sqliteTable('watches',{id:text('id').primaryKey(),userId:text('user_id').notNull(),document:text('document').notNull(),revision:integer('revision').notNull().default(0),createdAt:text('created_at').notNull()},t=>[index('idx_watches_user_created').on(t.userId,t.createdAt)]);
export const checks=sqliteTable('price_checks',{userId:text('user_id').primaryKey(),attemptedAt:integer('attempted_at').notNull()});
