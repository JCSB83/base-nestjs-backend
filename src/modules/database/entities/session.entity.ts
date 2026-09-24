import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'auth_session' })
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'session_id' })
  sessionId!: string;
  @Column('uuid', { name: 'user_id', nullable: false })
  userId!: string;
  @Column({ name: 'token', nullable: false })
  token!: string;
  @Column({ name: 'expires_at', nullable: false })
  expiresAt!: Date;
}
