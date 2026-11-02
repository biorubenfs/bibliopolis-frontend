import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, throwError, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { LibrariesResponse, LibraryResponse, CreateLibraryDto } from '../models/library.model';
import { UserBooksResponse } from '../models/user-book.model';
import { AddBookToLibraryDto } from '../models/book.model';
import { ApiError } from '../models/error.model';

@Injectable({
  providedIn: 'root'
})
export class LibraryService {
  private http = inject(HttpClient);

  getLibraries(search?: string, skip: number = 0, limit: number = 10): Observable<LibrariesResponse> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<LibrariesResponse>(
      `${environment.apiUrl}/libraries`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  getLibrary(libraryId: string): Observable<LibraryResponse> {
    return this.http.get<LibraryResponse>(
      `${environment.apiUrl}/libraries/${libraryId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  getLibraryBooks(libraryId: string, skip: number = 0, limit: number = 10): Observable<UserBooksResponse> {
    let params = new HttpParams()
      .set('libraryId', libraryId)
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<UserBooksResponse>(
      `${environment.apiUrl}/user-books`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  createLibrary(library: CreateLibraryDto): Observable<LibraryResponse> {
    return this.http.post<LibraryResponse>(
      `${environment.apiUrl}/libraries`,
      library
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateLibrary(libraryId: string, library: CreateLibraryDto): Observable<LibraryResponse> {
    return this.http.patch<LibraryResponse>(
      `${environment.apiUrl}/libraries/${libraryId}`,
      library
    ).pipe(
      catchError(this.handleError)
    );
  }

  deleteLibrary(libraryId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/libraries/${libraryId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  removeBookFromLibrary(libraryId: string, bookId: string): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiUrl}/libraries/${libraryId}/books/${bookId}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  addBookToLibrary(libraryId: string, data: AddBookToLibraryDto): Observable<void> {
    return this.http.post<void>(
      `${environment.apiUrl}/libraries/${libraryId}/books`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  downloadLibraryBooks(libraryId: string, format: 'pdf' | 'csv'): Observable<Blob> {
    const url = `${environment.apiUrl}/user-books/download`;
    const params = new HttpParams()
      .set('libraryId', libraryId)
      .set('format', format);
    return this.http.get(url, {
      params,
      responseType: 'blob'
    }).pipe(
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
