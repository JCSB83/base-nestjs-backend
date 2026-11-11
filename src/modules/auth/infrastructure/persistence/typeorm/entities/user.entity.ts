import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProfileEntity } from './profile.entity';

@Entity({ name: 'auth_mae_user' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId!: string;
  @Column({ name: 'display_name', length: 64, nullable: false })
  displayName!: string;
  @Column({ name: 'password', length: 64, nullable: false, select: false })
  password!: string;
  @Column({ name: 'first_name', length: 50, nullable: false })
  firstName!: string;
  @Column({ name: 'last_name', length: 50, nullable: true })
  lastName?: string;
  @Column({ name: 'email', length: 320, nullable: false, unique: true })
  email!: string;
  @Column({ name: 'phone', length: 15, nullable: false })
  phone!: string;
  @Column({ name: 'is_active', type: 'boolean', nullable: false })
  isActive!: boolean;
  @Column({ name: 'created_at', type: 'timestamptz', nullable: false })
  createdAt!: Date;
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt?: Date;
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;
  @Column({ name: 'profile_id', type: 'uuid', nullable: true })
  profileId!: string;
  @Column({ name: 'protected', type: 'boolean', nullable: false })
  protected!: boolean;
  @ManyToOne(() => ProfileEntity, { nullable: true })
  @JoinColumn({
    name: 'profile_id',
    referencedColumnName: 'profileId'
  })
  profile?: ProfileEntity | null;
}
