from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.ATR import ATR
from smartcard.CardType import AnyCardType
from smartcard.CardRequest import CardRequest
import sys
import socket
import time
import socketio

r = readers()
if len(r) < 1:
	print "error: No readers available!"
	sys.exit()

print("Available readers: ", r)

reader = r[0]
print "Using: ", reader

data = ""

sio = socketio.Client()

while True:

	try:

		cardtype = AnyCardType()
		cardrequest = CardRequest( timeout=1, cardType=cardtype)
		cardservice = cardrequest.waitforcard()

		COMMAND = [0xFF, 0xCA, 0x00, 0x00, 0x00]

		cardservice.connection.connect()

		while not data:

			data, sw1, sw2 = cardservice.connection.transmit(COMMAND)

			a = data[0] + 256 * data[1] + 256 * 256 * data[2] + 256 * 256 * 256 * data[3] 

			x = ""
			for i in range(4):
				x = x + hex(data[i]).replace("0x","")

			wert = int (x,16)
			print(x)
			
			try:
				sio.connect('http://localhost:3000')
				sio.emit('nfc', wert)
				time.sleep(0.1)
				sio.disconnect()
							
			except:
				print("Server connection fehlgeschlagen!")



	except:
		data = ""


	

