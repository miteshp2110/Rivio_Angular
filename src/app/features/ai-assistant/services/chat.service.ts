import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment'; // Assuming you have this, otherwise hardcode the URL

export interface RiviChatResponse {
  success: boolean;
  message: string;
  data: string; 
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  
  // Replace with your actual backend URL if you aren't using an environment file
  private baseUrl = environment.apiUrl || 'http://localhost:8080/api'; 

  askRivi(question: string): Observable<RiviChatResponse> {
    // This perfectly matches your {{baseUrl}}/api/chat/ask POST contract
    return this.http.post<RiviChatResponse>(`${this.baseUrl}/chat/ask`, { question });
  }
}