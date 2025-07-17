import { Conversation, FunctionCall } from '@hotel-voice-bot/shared';
import { logger } from '../../utils/logger.js';

export class FunctionCallHandler {
  public async handleFunctionCalls(
    functionCalls: FunctionCall[],
    conversation: Conversation
  ): Promise<any> {
    const results: Record<string, any> = {};

    for (const call of functionCalls) {
      let result;
      switch (call.name) {
        case 'bookRoom':
          result = await this.bookRoom(call.arguments);
          break;
        case 'orderRoomService':
          result = await this.orderRoomService(call.arguments);
          break;
        default:
          logger.warn('Unknown function call', { functionName: call.name });
          result = `No handler for function ${call.name}`;
      }
      results[call.name] = result;
    }

    return results;
  }

  private async bookRoom(args: Record<string, any>): Promise<string> {
    logger.info('Booking room', { args });
    return 'Room booked successfully.';
  }

  private async orderRoomService(args: Record<string, any>): Promise<string> {
    logger.info('Ordering room service', { args });
    return 'Room service ordered successfully.';
  }
}
