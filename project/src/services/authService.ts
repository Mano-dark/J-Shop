import { User } from '../types';
import { storageService } from './storageService';

class AuthService {
  login(username: string, password: string): User | null {
    const users = storageService.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      storageService.setCurrentUser(user);
      return user;
    }
    
    return null;
  }

  logout(): void {
    storageService.clearCurrentUser();
  }

  getCurrentUser(): User | null {
    return storageService.getCurrentUser();
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin';
  }
}

export const authService = new AuthService();