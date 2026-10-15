-- F-102 South Bay cities for the Near you map.
insert into cities (name, lat, lng) values
 ('Mountain View, CA', 37.3861, -122.0839), ('Palo Alto, CA', 37.4419, -122.1430), ('Sunnyvale, CA', 37.3688, -122.0363),
 ('Santa Clara, CA', 37.3541, -121.9552), ('Los Altos, CA', 37.3852, -122.1141), ('Cupertino, CA', 37.3230, -122.0322),
 ('Redwood City, CA', 37.4852, -122.2364), ('Menlo Park, CA', 37.4530, -122.1817), ('Milpitas, CA', 37.4323, -121.8996),
 ('Saratoga, CA', 37.2638, -122.0230), ('Campbell, CA', 37.2872, -121.9500), ('San Mateo, CA', 37.5630, -122.3255)
on conflict (name) do nothing;
