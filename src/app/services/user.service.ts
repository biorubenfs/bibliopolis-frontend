import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiError } from '../models/error.model';
import { UserBooksResponse } from '../models/user-book.model';

export interface UpdateProfileDto {
  name: string;
}

export interface UpdatePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);

  updateProfile(data: UpdateProfileDto): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/users/me`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  updatePassword(data: UpdatePasswordDto): Observable<void> {
    return this.http.patch<void>(
      `${environment.apiUrl}/users/me/password`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  getUserBooks(skip: number, limit: number, search?: string): Observable<UserBooksResponse> {
    let url = `${environment.apiUrl}/user-books?skip=${skip}&limit=${limit}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    
    return this.http.get<UserBooksResponse>(url).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ha ocurrido un error inesperado';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.error && (error.error as ApiError).message) {
      // API error
      errorMessage = (error.error as ApiError).message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
