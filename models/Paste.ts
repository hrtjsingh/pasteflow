import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPaste extends Document {
  shortId:       string;
  title?:        string;
  content:       string;
  language:      string;
  visibility:    'public' | 'unlisted' | 'private';
  passwordHash?: string;
  expiresAt?:    Date;
  burnAfterRead: boolean;
  burned:        boolean;
  views:         number;
  authorId?:     string;
  createdAt:     Date;
  updatedAt:     Date;
}

const PasteSchema = new Schema<IPaste>(
  {
    shortId:   {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
      // Enforce at DB level too — prevents injection via crafted shortIds
      match:    /^[a-zA-Z0-9_-]{6,16}$/,
    },
    title:     { type: String, default: '', maxlength: 200 },
    content:   { type: String, required: true, maxlength: 600_000 },
    language:  {
      type:    String,
      default: 'plaintext',
      enum:    [
        'plaintext','javascript','typescript','python','java','go','rust',
        'bash','json','html','css','markdown','yaml','sql','cpp','c','php','ruby',
      ],
    },
    visibility: {
      type:     String,
      enum:     ['public', 'unlisted', 'private'],
      default:  'unlisted',
      required: true,
    },
    // passwordHash is never returned in default queries (select: false)
    passwordHash:  { type: String, select: false },
    expiresAt:     { type: Date },
    burnAfterRead: { type: Boolean, default: false },
    burned:        { type: Boolean, default: false, index: true },
    views:         { type: Number, default: 0, min: 0 },
    authorId:      { type: String, index: true },
  },
  {
    timestamps: true,
    // Prevent mass-assignment of arbitrary fields
    strict: true,
  }
);

// MongoDB TTL index — auto-deletes documents after expiresAt
PasteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Compound index for dashboard queries
PasteSchema.index({ authorId: 1, createdAt: -1 });

const Paste: Model<IPaste> =
  mongoose.models.Paste || mongoose.model<IPaste>('Paste', PasteSchema);

export default Paste;
