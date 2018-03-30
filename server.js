var radius = require('radius');
var dgram = require("dgram");

var secret = "secretsecretsecret";
var server = dgram.createSocket("udp4");
var listenPort = "1812";
var sourceIP = "localhost";
var sourcePort = "1812";
var destinationIP = "localhost";
var destinationPort = "1813";

var identityTracking = {}; // Need to track the original source ports of every one or else we can't respond to the client

server.on("message", function (msg, rinfo)
{
  var username, password, packet, radiusDestinationIP, radiusDestinationPort;
  
  packet = radius.decode({packet: msg, secret: secret});
  console.log("Received packet from " + rinfo.address + " on port " + rinfo.port + ", packet is " + JSON.stringify(packet));
  
  username = packet.attributes['User-Name'];
  password = packet.attributes['User-Password'];
  
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
  
  switch(packet.code)
  {
	  default:  // Pass everything else
		server.send(msg, 0, msg.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
		{
			console.log("Received packet.code = " + packet.code + ", sending unaltered packet to " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(packet));
			if (err)
				{ console.log("Error sending response to ", radiusDestinationIP); }
		});
	  break;
	  
	  case 'Access-Challenge':
	  	// Pluck the original source from the packet, because now we're returning, and send
		radiusDestinationIP = identityTracking[packet.identifier]["address"];
		radiusDestinationPort = identityTracking[packet.identifier]["port"];
		server.send(msg, 0, msg.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
		{
			console.log("Received 'Access-Accept', sending back to original client of " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(packet));
			if (err)
			{ console.log("Error sending response to ", radiusDestinationIP); }
		});	  
	  break;
	  
	  case 'Access-Accept':
		// Pluck the original source from the packet, because now we're returning, and send
		radiusDestinationIP = identityTracking[packet.identifier]["address"];
		radiusDestinationPort = identityTracking[packet.identifier]["port"];
		server.send(msg, 0, msg.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
		{
			console.log("Received 'Access-Accept', sending back to original client of " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(packet));
			if (err)
			{ console.log("Error sending response to ", radiusDestinationIP); }
		});
		// Trim the identityTracking Object lest we cause a memory leak
		delete identityTracking[packet.identifier];
	  break;
	 
	  case 'Access-Reject':
		// Pluck the original source from the packet, because now we're returning, and send
		radiusDestinationIP = identityTracking[packet.identifier]["address"];
		radiusDestinationPort = identityTracking[packet.identifier]["port"];
		server.send(msg, 0, msg.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
		{
			console.log("Received 'Access-Reject', sending back to original client of " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(packet));
			if (err)
			{ console.log("Error sending response to ", radiusDestinationIP); }
		});
		// Trim the identityTracking Object lest we cause a memory leak
		delete identityTracking[packet.identifier];
	  break;	 
	  
	  
	  case 'Access-Request':
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

			if (password.trim().endsWith(",push"))
			{
				console.log("Access-Request for " + username + ", request for push included, doing nothing");
			}
	  
		}
		
		// Add to identity tracking so we can figure out where to return this crap
		identityTracking[packet.identifier] = {"address": rinfo.address, "port": rinfo.port};

		// Build the radius response
		var response = radius.encode_response(
		{
			packet: packet,
			code: packet.code,
			secret: secret,
			attributes:  packet.attributes
		});

		server.send(response, 0, response.length, radiusDestinationPort, radiusDestinationIP, function(err, bytes)
		{
			console.log("Sending updated packet to " + radiusDestinationIP + ", port " + radiusDestinationPort + ", packet is " + JSON.stringify(radius.decode({packet: response, secret: secret})));
			if (err)
				{ console.log("Error sending response to ", radiusDestinationIP); }
		});
  
	  break;
	  
  
  }  // end of switch
 
 });

server.on("listening", function ()
{
  var address = server.address();
  console.log("radius server listening " +
      address.address + ":" + address.port);
});

server.bind(listenPort);
