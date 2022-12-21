const dgram = require('dgram');
const { log } = require('./logger.js')
const logger = new log()
const { Buffer } = require('node:buffer');
const replace = require('buffer-replace');

const server = dgram.createSocket('udp4');
let ipArray = { };

serverip = "0.0.0.0"
serverPort = 19132

proxyip = "0.0.0.0"
proxyPort = 19133

server.on('error', (err) => {
    logger.error(`server error:\n${err.stack}`);
    server.close();
});

function changePort(buffer){
    return replace(buffer, serverPort,proxyPort)    
}

function packetReceive(msg, rinfo, sendPort)
{
    type = msg.toString('hex').substr(0,2)
    if (rinfo.address !== serverip)
    {
        var portTime = new Date();
        if (typeof(ipArray[rinfo.port]) === 'undefined')
        {
            ipArray[rinfo.port] = { 'port': rinfo.port, 'ip': rinfo.address,
                'time': portTime.getTime(), 'socket': dgram.createSocket("udp4")};
            ipArray[rinfo.port].socket.bind(rinfo.port);
            ipArray[rinfo.port].socket.on("message", function(msgg, rinfoo)
            {
                packetReceive(msgg, rinfoo, ipArray[rinfo.port]['port']);
            });
        }
        else
        {
            ipArray[rinfo.port]['time'] = portTime.getTime();
        }
    }
    if (rinfo.address !== serverip)
    {
        logger.info(`0x${type} packet received from client: ${rinfo.address}`)
        ipArray[rinfo.port].socket.send(msg, 0, msg.length, serverPort,
            serverip);
    }

    else if (rinfo.port == serverPort)
    {
        type = msg.toString('hex').substr(0,2)
        logger.info(`0x${type} packet received from server: ${rinfo.address}`)

        var currentTime = new Date().getTime();
        if ((currentTime - ipArray[sendPort]['time']) > 30000)
        {
            ipArray[sendPort].socket.close();
            delete ipArray[sendPort];
        }
        else
        {
            server.send(changePort(msg), 0, msg.length, ipArray[sendPort]['port'], ipArray[sendPort]['ip']);
        }
    }
}

server.on('message', (msg, info) => {
    packetReceive(msg,info,info.port)
});

server.on('listening', () => {
    const address = server.address();
    logger.info(`server listening ${address.address}:${address.port}`);
});


server.bind({address: '0.0.0.0', port: 19149});