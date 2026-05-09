import { Component, OnDestroy, OnInit, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthState } from '../../../core/state/auth.state';
import { ChatService } from '../services/chat.service';
import { delay, finalize } from 'rxjs/operators';

interface ChatMessage {
  id: number;
  sender: 'USER' | 'RIVI';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

@Component({
  selector: 'app-ask-rivi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ask-rivi.component.html',
  // Locking the layout and setting the background color directly on the host
  host: { class: 'block h-full w-full relative' }
})
export class AskRiviComponent implements OnInit, OnDestroy {
  @ViewChild('chatScrollContainer') private scrollContainer!: ElementRef;
  
  public authState = inject(AuthState);
  private chatService = inject(ChatService);
  
  messages = signal<ChatMessage[]>([]);
  userInput = signal('');
  isTyping = signal(false);

  // Typewriter State
  placeholderText = signal('');
  private typeWriterTimeout: any;
  private currentPhraseIndex = 0;
  private currentCharIndex = 0;
  private isDeleting = false;
  
  private placeholderPhrases = [
    "Who all were absent on 15th April?",
    "How much salary did we pay to the Engineering team?",
    "Show me the pending leave requests.",
    "What is our total headcount across all branches?",
    "Calculate the total overtime paid last month."
  ];

  ngOnInit() {
    this.startTypewriterEffect();
  }

  ngOnDestroy() {
    clearTimeout(this.typeWriterTimeout);
  }

  startTypewriterEffect() {
    const currentPhrase = this.placeholderPhrases[this.currentPhraseIndex];
    let typingSpeed = this.isDeleting ? 30 : 60; 

    if (!this.isDeleting && this.currentCharIndex === currentPhrase.length) {
      typingSpeed = 2500;
      this.isDeleting = true;
    } else if (this.isDeleting && this.currentCharIndex === 0) {
      this.isDeleting = false;
      this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.placeholderPhrases.length;
      typingSpeed = 500;
    }

    const nextText = currentPhrase.substring(0, this.currentCharIndex + (this.isDeleting ? -1 : 1));
    this.placeholderText.set(nextText);
    this.currentCharIndex += this.isDeleting ? -1 : 1;

    this.typeWriterTimeout = setTimeout(() => this.startTypewriterEffect(), typingSpeed);
  }

  sendMessage() {
    const text = this.userInput().trim();
    if (!text) return;

    // Add User Message
    this.messages.update(msgs => [...msgs, { id: Date.now(), sender: 'USER', text: text, timestamp: new Date() }]);
    this.userInput.set('');
    this.scrollToBottom();

    // Trigger Typing Animation
    this.isTyping.set(true);
    this.scrollToBottom();

    // API Call with a small artificial delay so the typing animation always plays smoothly
    this.chatService.askRivi(text)
      .pipe(
        delay(600), // Artificial AI "thinking" time
        finalize(() => {
          this.isTyping.set(false);
          this.scrollToBottom();
        })
      )
      .subscribe({
        next: (res) => {
          this.messages.update(msgs => [...msgs, {
            id: Date.now() + 1,
            sender: 'RIVI',
            text: res.data, 
            timestamp: new Date()
          }]);
        },
        error: (err) => {
          console.error("Ask Rivi API Error:", err);
          this.messages.update(msgs => [...msgs, {
            id: Date.now() + 1,
            sender: 'RIVI',
            text: 'I could not connect to the Rivio servers. Please ensure the backend API is running.',
            timestamp: new Date(),
            isError: true
          }]);
        }
      });
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!this.isTyping() && this.userInput().trim()) {
        this.sendMessage();
      }
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 100); // 100ms ensures Angular has rendered the DOM before scrolling
  }
}