import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email:        string;
  username:     string;
  passwordHash: string;
  createdAt:    Date;
  updatedAt:    Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      trim:      true,
      maxlength: 254,
      // RFC 5321 basic format check at DB level
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    username: {
      type:      String,
      required:  true,
      unique:    true,
      trim:      true,
      minlength: 3,
      maxlength: 30,
      // Alphanumeric + _ and - only
      match: /^[a-zA-Z0-9_-]+$/,
    },
    // passwordHash never returned in default queries
    passwordHash: { type: String, required: true, select: false },
  },
  {
    timestamps: true,
    strict:     true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
