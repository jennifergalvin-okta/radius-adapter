# radius-adapter


This code is meant to augment and adapt RADIUS traffic used with the Okta RADIUS adapter.


It is designed to auto-append ",push" onto passwords passed by VPN clients to avoid the returned Okta verify menu, and includes a "backdoor" to allow the advanced users to type ",menu" and get a menu back (if they lose their token).
