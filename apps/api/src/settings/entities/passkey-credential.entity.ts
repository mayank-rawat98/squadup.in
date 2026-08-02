import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * One WebAuthn passkey credential. A user may register many. Only public
 * material is stored — the private key never leaves the authenticator device.
 */
@Entity({ name: 'passkey_credential' })
export class PasskeyCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  /** base64url-encoded credential ID from the authenticator. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 512 })
  credentialId!: string;

  /** COSE public key bytes. */
  @Column({ type: 'bytea' })
  publicKey!: Buffer;

  /** Signature counter for clone detection. bigint stored as string in pg. */
  @Column({
    type: 'bigint',
    default: 0,
    transformer: {
      to: (v: number) => v,
      from: (v: string) => Number(v),
    },
  })
  counter!: number;

  @Column({ type: 'varchar', length: 32, default: 'singleDevice' })
  deviceType!: string;

  @Column({ default: false })
  backedUp!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  transports?: string[] | null;

  @Column({ type: 'varchar', length: 100 })
  nickname!: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
