import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'languages' })
export class Language {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** BCP-47 / ISO-639 code, e.g. "en" */
  @Column({ type: 'varchar', length: 16, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64 })
  label!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
