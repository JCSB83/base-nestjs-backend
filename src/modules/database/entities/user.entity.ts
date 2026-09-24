import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { ProfileOptionEntity } from './profileOption.entity';

@Entity({ name: 'auth_user' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId!: string;
  @Column({ name: 'user_name', length: 64, nullable: false })
  userName!: string;
  @Column({ name: 'password', length: 64, nullable: false, select: false })
  password!: string;
  @Column({ name: 'first_name', length: 50, nullable: false })
  firstName!: string;
  @Column({ name: 'middle_name', length: 50, nullable: true })
  middleName?: string;
  @Column({ name: 'last_name', length: 50, nullable: false })
  lastName!: string;
  @Column({ name: 'email', length: 320, nullable: false })
  email!: string;
  @Column({ name: 'phone', length: 15, nullable: false })
  phone!: string;
  @Column({ name: 'is_active', type: 'boolean', nullable: false })
  isActive!: boolean;
  @Column({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt?: Date;
  @Column({ name: 'profile_id', type: 'uuid', nullable: true })
  profileId!: string;
  @ManyToOne(() => ProfileEntity, { nullable: true })
  @JoinColumn({
    name: 'profile_id',
    referencedColumnName: 'profileId'
  })
  profile?: ProfileEntity | null;
}
