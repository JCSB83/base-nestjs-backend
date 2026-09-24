import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ProfileEntity } from './profile.entity';

@Entity({ name: 'auth_profile_option' })
export class ProfileOptionEntity {
    @PrimaryColumn({ name: 'profile_id', type: 'uuid', nullable: false })
    profileId!: string;
    @PrimaryColumn({ name: 'option_id', type: 'numeric', nullable: false })
    optionId!: number;

    @ManyToOne(() => ProfileEntity, profile => profile.profileOptions, { nullable: false })
    @JoinColumn({
        name: 'profile_id',
        referencedColumnName: 'profileId',
    })
    profile?: ProfileEntity;
}
