import { Component, OnDestroy, OnInit, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthState } from '../../../core/state/auth.state';

interface ChatMessage {
  id: number;
  sender: 'USER' | 'RIVI';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-ask-rivi',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ask-rivi.component.html',
  host: { class: 'block h-full relative' }
})
export class AskRiviComponent implements OnInit, OnDestroy {
  @ViewChild('chatScrollContainer') private scrollContainer!: ElementRef;
  
  // Chat State
  messages = signal<ChatMessage[]>([]);
  userInput = signal('');
  isTyping = signal(false);

  // Typewriter Placeholder State
  placeholderText = signal('');
  private typeWriterTimeout: any;
  private currentPhraseIndex = 0;
  private currentCharIndex = 0;
  private isDeleting = false;
  
  private placeholderPhrases = [
    "Who all were absent on 15th April?",
    "How much salary did we pay to Bill Gates?",
    "Show me the pending leave requests for Engineering.",
    "What is our total headcount across all branches?",
    "Who is on probation right now?",
    "Calculate the total overtime paid last month."
  ];

  constructor(public authState: AuthState) {}

  ngOnInit() {
    this.startTypewriterEffect();
  }

  ngOnDestroy() {
    clearTimeout(this.typeWriterTimeout);
  }

  // --- TYPEWRITER LOGIC ---
  startTypewriterEffect() {
    const currentPhrase = this.placeholderPhrases[this.currentPhraseIndex];
    let typingSpeed = this.isDeleting ? 30 : 60; // Deleting is faster

    if (!this.isDeleting && this.currentCharIndex === currentPhrase.length) {
      // Pause at the end of the word
      typingSpeed = 2500;
      this.isDeleting = true;
    } else if (this.isDeleting && this.currentCharIndex === 0) {
      // Move to next phrase
      this.isDeleting = false;
      this.currentPhraseIndex = (this.currentPhraseIndex + 1) % this.placeholderPhrases.length;
      typingSpeed = 500;
    }

    const nextText = currentPhrase.substring(0, this.currentCharIndex + (this.isDeleting ? -1 : 1));
    this.placeholderText.set(nextText);
    this.currentCharIndex += this.isDeleting ? -1 : 1;

    this.typeWriterTimeout = setTimeout(() => this.startTypewriterEffect(), typingSpeed);
  }

  // --- CHAT LOGIC ---
  sendMessage() {
    const text = this.userInput().trim();
    if (!text) return;

    // 1. Add User Message
    this.messages.update(msgs => [...msgs, {
      id: Date.now(),
      sender: 'USER',
      text: text,
      timestamp: new Date()
    }]);
    
    this.userInput.set('');
    this.scrollToBottom();

    // 2. Trigger Rivi's "Typing..." state
    this.isTyping.set(true);

    // 3. Simulate AI processing time (1.5 seconds)
    setTimeout(() => {
      this.isTyping.set(false);
      this.messages.update(msgs => [...msgs, {
        id: Date.now() + 1,
        sender: 'RIVI',
        text: `I am currently in training to analyze company data! 🚀 \n\nSoon, I will be able to instantly answer queries like **"${text}"** by directly scanning the organizational database. Stay tuned!`,
        timestamp: new Date()
      }]);
      this.scrollToBottom();
    }, 1500);
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}