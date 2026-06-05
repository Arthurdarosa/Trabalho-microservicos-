const amqplib = require('amqplib');
const QUEUE_ABERTURA = 'fila_abertura';

async function iniciarHardwareSimulado() {
    try {
        const connection = await amqplib.connect('amqp://localhost');
        const channel = await connection.createChannel();
        
        // Garante que a fila existe
        await channel.assertQueue(QUEUE_ABERTURA, { durable: true });

        console.log(' [Controle Abertura] Inicializado.');
        console.log(' Aguardando comandos do sistema central...');

        // Fica escutando a fila eternamente
        channel.consume(QUEUE_ABERTURA, (msg) => {
            if (msg !== null) {
                const dados = JSON.parse(msg.content.toString());
                
                // --- A SIMULAÇÃO EXIGIDA PELO PROFESSOR ---
                console.log(` [HARDWARE ACTION] PORTA DESTRAVADA!`);
                console.log(` Compartimento ID : ${dados.compartimento_id}`);
                console.log(` Motivo da Ação   : ${dados.motivo}`);

                // Confirma que a porta abriu com sucesso para tirar a mensagem da fila
                channel.ack(msg);
            }
        });
    } catch (err) {
        console.error(' Erro ao conectar com o RabbitMQ:', err.message);
        console.log('Certifique-se de que o Docker do RabbitMQ está rodando.');
    }
}

iniciarHardwareSimulado();