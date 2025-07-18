describe('WebSocket Real-time Transcription', () => {
  it('should open WebSocket, stream audio, and receive server messages', () => {
    cy.visit('/'); // Navigate to your application

    cy.window().then((win) => {
      const websocket = new win.WebSocket('ws://localhost:3000/ws-transcribe');
      
      let messagesReceived = 0;
      const expectedMessages = 2; // Expecting 2 server messages
      
      websocket.onopen = () => {
        cy.log('WebSocket opened');
        
        // Simulate audio streaming by sending binary data
        const mockAudioData = new ArrayBuffer(1024);
        websocket.send(mockAudioData);
      };
      
      websocket.onmessage = (event) => {
        cy.log('Message received:', event.data);
        messagesReceived++;
        
        if (messagesReceived === expectedMessages) {
          websocket.close();
          cy.log('WebSocket closed after receiving expected messages');
        }
      };
      
      websocket.onclose = () => {
        cy.log('WebSocket closed');
        expect(messagesReceived).to.equal(expectedMessages);
      };
      
      websocket.onerror = (error) => {
        cy.log('WebSocket error:', error);
        throw new Error('WebSocket connection failed');
      };
    });
  });
});
