var radius = require('radius');
var dgram = require("dgram");

var secret = "secretsecretsecret";
var server = dgram.createSocket("udp4");
var listenPort = "1812";
var sourceIP = "localhost";
var sourcePort = "1812";
var destinationIP = "localhost";
var destinationPort = "1813";

server.on("message", function (msg, rinfo)
{
  var username, password, packet, radiusDestinationIP, radiusDestinationPort, newPassword;
  
  packet = radius.decode({packet: msg, secret: secret});
  console.log("Received packet from " + rinfo.address + " on port " + rinfo.port + ", packet is " + JSON.stringify(packet));

  
  username = packet.attributes['User-Name'];
  password = packet.attributes['User-Password'];
  
  // Pass everything else
  if (packet.code != 'Access-Request')
	{ console.log("Received packet.code = " + packet.code + ", ignoring"); }
  else
  {

    if ( ! password.trim().endsWith(",menu") && ! password.trim().endsWith(",push") )
    {
      packet.attributes['User-Password'] = password.trim() + ",push";
      console.log("Access-Request for " + username + ", appending ,push for auto-push");
    }
    else
    {
      if (password.trim().endsWith(",menu"))
      {
        packet.attributes['User-Password'] = password.trim().replace(",menu", "");
        console.log("Access-Request for " + username + ", request for menu, trimming ,menu from password field");
      }

      if (password.trim.endsWith(",push"))
      {
        console.log("Access-Request for " + username + ", request for push included, doing nothing");
      }
	  
    }
	
	// Send the packet on to the opposite side
    switch(rinfo.address)
    {
      case sourceIP:
        radiusDestinationIP = destinationIP;
        radiusDestinationPort = destinationPort;
        break;
      case destinationIP:
        radiusDestinationIP = sourceIP;
        radiusDestinationPort = sourcePort;
        break;
    }
	
	 // build the radius response
    var response = radius.encode_response(
	{
		packet: packet,
        code: packet.code,
        secret: secret
    });
	

    server.send(response, 0, response.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
    {
	  console.log("Sending updated packet to " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(packet));
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
