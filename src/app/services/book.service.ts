import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, throwError, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BooksResponse, ExternalBookResponse } from '../models/book.model';
import { UpdateUserBookDto, UserBookResponse } from '../models/user-book.model';
import { ApiError } from '../models/error.model';

@Injectable({
  providedIn: 'root'
})
export class BookService {
  private http = inject(HttpClient);

  getBooks(skip: number = 0, limit: number = 25): Observable<BooksResponse> {
    const params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());

    return this.http.get<BooksResponse>(
      `${environment.apiUrl}/books`,
      { params }
    ).pipe(
      catchError(this.handleError)
    );
  }

  updateUserBook(userBookId: string, data: UpdateUserBookDto): Observable<UserBookResponse> {
    return this.http.patch<UserBookResponse>(
      `${environment.apiUrl}/user-books/${userBookId}`,
      data
    ).pipe(
      catchError(this.handleError)
    );
  }

  searchExternalBook(isbn: string): Observable<ExternalBookResponse> {
    const params = new HttpParams().set('isbn', isbn);

    return this.http.get<ExternalBookResponse>(
      `${environment.apiUrl}/external`,
      { params }
    ).pipe(
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
