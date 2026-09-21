import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'currencies' })
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** ISO-4217 code, e.g. "USD" */
  @Column({ type: 'varchar', length: 8, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64 })
  label!: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  symbol?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
