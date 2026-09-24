import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProfileOptionEntity } from './profileOption.entity';

@Entity({ name: 'auth_profile' })
export class ProfileEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'profile_id' })
  profileId!: string;
  @Column({ name: 'name', length: 50, nullable: false })
  name!: string;
  @Column({ name: 'description', length: 100, nullable: true })
  description?: string;
  @Column({ name: 'is_internal', type: 'boolean', nullable: false })
  isInternal!: boolean;
  @Column({ name: 'is_active', type: 'boolean', nullable: false })
  isActive!: boolean;
  @Column({ name: 'created_at', type: 'timestamp', nullable: false })
  createdAt!: Date;
  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt?: Date;

  @OneToMany(() => ProfileOptionEntity, o => o.profile)
  profileOptions?: ProfileOptionEntity[];
}
