import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'auth_user_refresh_token' })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'refresh_token_id' })
  refreshTokenId!: string;
  @Column('uuid', { name: 'user_id', nullable: false })
  userId!: string;
  @Column({ name: 'jti', nullable: false, length: 36 })
  jti!: string;
  @Column({ name: 'expires_at', type: 'timestamptz',nullable: false })
  expiresAt!: Date;
}
