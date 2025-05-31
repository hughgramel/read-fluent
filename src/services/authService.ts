import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  updateEmail,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserService } from './userService';

export class AuthService {
  private static googleProvider = new GoogleAuthProvider();

  static async signUpWithEmail(
    email: string,
    password: string,
    displayName: string | null = null
  ): Promise<FirebaseUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    if (displayName) {
      await updateProfile(user, { displayName });
    }

    await sendEmailVerification(user);
    await UserService.createUser(user.uid, user.email!, user.displayName, user.photoURL);
    
    return user;
  }

  static async signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await this.handleSignIn(user);
    return user;
  }

  static async signInWithGoogle(): Promise<FirebaseUser> {
    const { user } = await signInWithPopup(auth, this.googleProvider);
    await this.handleSignIn(user);
    return user;
  }

  static async signOut(): Promise<void> {
    await auth.signOut();
  }

  static async updateUserProfile(
    displayName: string | null = null,
    photoURL: string | null = null
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');

    await updateProfile(user, { displayName, photoURL });
    await UserService.updateProfile(user.uid, { displayName, photoURL });
  }

  static async updateUserEmail(
    newEmail: string,
    password: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');

    // Re-authenticate user before email change
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);
    
    await updateEmail(user, newEmail);
    await UserService.updateEmail(user.uid, newEmail);
    await sendEmailVerification(user);
  }

  static async updateUserPassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');

    // Re-authenticate user before password change
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
    
    await updatePassword(user, newPassword);
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  static async deleteAccount(password: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('No user is currently signed in');

    // Re-authenticate user before deletion
    const credential = EmailAuthProvider.credential(user.email!, password);
    await reauthenticateWithCredential(user, credential);
    
    await UserService.deleteUser(user.uid);
    await deleteUser(user);
  }

  private static async handleSignIn(user: FirebaseUser): Promise<void> {
    const userDoc = await UserService.getUser(user.uid);
    
    if (!userDoc) {
      // Create user document if it doesn't exist
      await UserService.createUser(
        user.uid,
        user.email!,
        user.displayName,
        user.photoURL
      );
    } else {
      // Update last login time
      await UserService.updateLastLogin(user.uid);
    }
  }
} 