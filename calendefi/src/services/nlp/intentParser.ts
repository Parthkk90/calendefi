import { ParsedIntent, IntentType, PaymentIntent, SwapIntent } from '../../types/intent';

export class IntentParser {
  private paymentRegex = /(?:send|pay|transfer)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+([a-zA-Z0-9._@-]+)/i;
  private swapRegex = /(?:swap|exchange)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+(?:to|for)\s+(\w+)/i;

  public parseEvent(title: string, description?: string): ParsedIntent {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    // Try payment parsing
    const paymentMatch = text.match(this.paymentRegex);
    if (paymentMatch) {
      return {
        type: 'payment',
        amount: parseFloat(paymentMatch[1]),
        token: paymentMatch[2].toUpperCase(),
        recipient: paymentMatch[3],
        raw: title,
        confidence: 0.9
      } as PaymentIntent;
    }

    // Try swap parsing
    const swapMatch = text.match(this.swapRegex);
    if (swapMatch) {
      return {
        type: 'swap',
        amount: parseFloat(swapMatch[1]),
        fromToken: swapMatch[2].toUpperCase(),
        toToken: swapMatch[3].toUpperCase(),
        raw: title,
        confidence: 0.8
      } as SwapIntent;
    }

    // Check for governance keywords
    if (text.includes('vote') || text.includes('governance') || text.includes('rsvp')) {
      return {
        type: 'governance',
        raw: title,
        confidence: 0.7
      };
    }

    return {
      type: 'unknown',
      raw: title,
      confidence: 0
    };
  }
}