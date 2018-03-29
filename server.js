var radius = require('radius');
var dgram = require("dgram");

var secret = 'PeterPiperPickedAPeckOfPickledPeppers';
var server = dgram.createSocket("udp4");
var listenPort = '1812';
var sourceIP = 'localhost';
var sourcePort = '1813';
var destinationIP = 'localhost';
var destinationPort = '1813';

server.on("message", function (msg, rinfo)
{
  var code, username, password, packet, radiusDestination, radiusPort;
  packet = radius.decode({packet: msg, secret: secret});

  // Pass everything else
  if (packet.code != 'Access-Request')
  {
    var newPacket = radius.encode(
    {
      code: packet.code,
      secret: secret,
      attributes: packet.attributes
    });
    console.log("Received packet.code = " + packet.code + ", ignoring");
  }
  else
  {

    username = packet.attributes['User-Name'];
    password = packet.attributes['User-Password'];

    var newPassword;

    if ( ! password.trim().endsWith(",menu") || ! password.trim().endsWith(",push") )
    {
      newPassword = password + ",push";
      console.log("Access-Request for " + username + ", appending ,push for auto-push");
    }
    else
    {
      if (password.trim().endsWith(",menu"))
      {
        newPassword = password.trim().replace(",menu", "");
        console.log("Access-Request for " + username + ", request for menu, trimming ,menu from password field");
      }

      if (password.trim.endsWith(",push"))
      {
        newPassword = password;
        console.log("Access-Request for " + username + ", request for push included, doing nothing");
      }

      var newPacket = radius.encode(
      {
        code: packet.code,
        secret: secret,
        attributes: [
          ['NAS-IP-Address'], packet.attributes['NAS-IP-Address'],
          ['User-Name'], packet.attributes['User-Name'],
          ['User-Password'], newPassword]
      });
    }

    switch(rinfo.address)
    {
      case sourceIP:
        radiusDestination = destinationIP;
        radiusPort = destinationPort;
        break;
      case destinationIP:
        radiusDestination = sourceIP;
        radiusPort = sourcePort;
        break;
    }

    console.log("Sending newPacket");
    server.send(newPacket, 0, response.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
    {
      if (err)
        { console.log("Error sending response to ", destinationIP); }
    });

  }  // end of else

});

server.on("listening", function ()
{
  var address = server.address();
  console.log("radius server listening " +
      address.address + ":" + address.port);
});

server.bind(listenPort);
