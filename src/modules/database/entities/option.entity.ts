import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'auth_option' })
export class OptionEntity {
  @PrimaryColumn({ name: 'option_id', type: 'numeric' })
  optionId!: number;
  @Column({ name: 'code', length: 50, nullable: false })
  code!: string;
  @Column({ name: 'name', length: 50, nullable: false })
  name!: string;
  @Column({ name: 'description', length: 100, nullable: true })
  description?: string;
  @Column({ name: 'is_active', type: 'boolean', nullable: false })
  isActive!: boolean;
}
