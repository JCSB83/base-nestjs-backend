import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'auth_user_session' })
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'session_id' })
  sessionId!: string;
  @Column('uuid', { name: 'user_id', nullable: false })
  userId!: string;
  @Column({ name: 'jti', nullable: false, length: 36 })
  jti!: string;
  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;
}
