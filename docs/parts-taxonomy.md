# Car Parts Taxonomy

Comprehensive category reference for the used car parts marketplace.
Researched from Pull-A-Part, LKQ Pick Your Part, RockAuto, AutoZone, eBay Motors, Car-Part.com, and OEM manufacturer catalogs (Toyota, Ford, GM via MarkLines industry standard).

## References

| Source | URL | Coverage |
|--------|-----|----------|
| Pull-A-Part | https://www.pullapart.com | 24 flat part types, salvage-yard-centric |
| LKQ Pick Your Part | https://www.lkqpickyourpart.com | ~16 part types, flat salvage structure |
| RockAuto | https://www.rockauto.com | ~19 top-level + rich subcategories, aftermarket |
| AutoZone | https://www.autozone.com | Consumer-facing grouped navigation |
| eBay Motors | https://www.ebay.com/motors | 20 top-level subcategories, best used/secondary market taxonomy |
| Car-Part.com | https://www.car-part.com | Used parts search, major glass and door categories |
| MarkLines (OEM standard) | https://www.marklines.com | 26-page 3-level taxonomy, OEM/industry gold standard |
| Wikipedia – List of auto parts | https://en.wikipedia.org/wiki/List_of_auto_parts | Engineering taxonomy reference |

---

## Recommended Part Type Enum

34 top-level categories for a used/salvage-oriented marketplace, sized to match the granularity of eBay Motors and RockAuto.

```
ENGINE
TRANSMISSION
TRANSFER_CASE
DRIVETRAIN
BRAKES
SUSPENSION
STEERING
ENGINE_COOLING
FUEL_AND_AIR
EXHAUST
IGNITION
ELECTRICAL_CHARGING
ELECTRICAL_WIRING
ECU_AND_MODULES
SENSORS
HVAC
BODY_PANELS
DOORS
GLASS
LIGHTING
MIRRORS
INTERIOR
SEATS
AIRBAGS
INSTRUMENT_CLUSTER
AUDIO_AND_INFOTAINMENT
WHEELS_AND_TIRES
BELT_DRIVE
WIPERS
SUNROOF
TOWING
EV_AND_HYBRID
ADAS
HARDWARE
```

---

## Detailed Category Reference

### ENGINE
*Sources: All — MarkLines (ICE Powertrain > Engine structural parts), RockAuto (Engine), eBay (Engines & Engine Parts), Pull-A-Part (Engine), 1A Auto (Engine & Engine Management)*

- Complete Engine Assembly (long block, short block)
- Cylinder Block / Head
- Pistons, Rings, Connecting Rods
- Crankshaft / Camshaft
- Valvetrain (valves, springs, rockers, timing chain/belt)
- Engine Gaskets & Seals
- Engine Mounts
- Turbocharger / Supercharger
- Engine Covers / Oil Pan

> **Salvage note:** Complete engine assemblies are the #1 most searched used part. Salvage yards sell long block and short block variants.

---

### ENGINE_COOLING
*Sources: RockAuto (Cooling System), MarkLines (Engine cooling system), eBay (Engine Cooling Components), Pull-A-Part (Radiator, Water Pump)*

- Radiator
- Water Pump
- Thermostat
- Cooling Fan / Fan Assembly / Shroud
- Radiator Overflow Reservoir
- Coolant Hoses
- Intercooler (turbocharged engines)

---

### FUEL_AND_AIR
*Sources: RockAuto (Fuel & Air), eBay (Air & Fuel Delivery), 1A Auto (Fuel & Emissions), MarkLines (Fuel supply system, Air intake)*

- Fuel Pump (in-tank module)
- Fuel Injectors
- Fuel Rail
- Throttle Body
- Intake Manifold
- Air Filter / Air Box / Cold Air Intake
- Carburetor (classic/older vehicles)
- Fuel Tank
- Fuel Pressure Regulator
- Mass Air Flow (MAF) / MAP Sensor

---

### EXHAUST
*Sources: RockAuto (Exhaust & Emission), eBay (Exhaust & Emission Systems), MarkLines (Air intake and exhaust systems), Pull-A-Part (Catalytic Converter, Muffler)*

- Exhaust Manifold / Headers
- Catalytic Converter
- Muffler / Resonator
- Exhaust Pipe (mid-pipe, flex pipe, down pipe)
- EGR Valve / EGR Cooler
- Oxygen (O2) Sensor
- DPF / Diesel Particulate Filter

> **Salvage note:** Pull-A-Part explicitly does NOT sell catalytic converters due to theft risk — requires special handling in platform rules.

---

### IGNITION
*Sources: RockAuto (Ignition), eBay (Ignition Systems & Components), MarkLines (Ignition system), Pull-A-Part (Ignition, Distributor)*

- Ignition Coil / Coil Pack
- Distributor
- Spark Plugs / Glow Plugs (diesel)
- Ignition Module
- Spark Plug Wires
- Crankshaft / Camshaft Position Sensor
- Knock Sensor

---

### TRANSMISSION
*Sources: All — MarkLines (Automatic/Manual/CVT/DCT), RockAuto (Transmission), eBay (Transmission & Drivetrain), Pull-A-Part (Transmission, Gearbox)*

- Complete Automatic Transmission
- Complete Manual Transmission
- CVT (Continuously Variable Transmission)
- Torque Converter
- Transmission Valve Body
- Transmission Solenoids
- Clutch Assembly (manual)
- Clutch Master / Slave Cylinder
- Shift Linkage / Shift Lever
- Transmission Control Module (TCM)

> **Salvage note:** Complete transmissions are the #2 most searched used part after engines.

---

### TRANSFER_CASE
*Sources: MarkLines (4WD transfer, Driveline parts), eBay (Transmission & Drivetrain)*

- Complete Transfer Case
- Transfer Case Motor / Actuator
- Transfer Case Control Module

---

### DRIVETRAIN
*Sources: MarkLines (Driveline parts, Axle, Differential), eBay (Transmission & Drivetrain), RockAuto (Drivetrain), Pull-A-Part (Axle), 1A Auto (Drivetrain)*

- Front / Rear Axle Assembly
- CV Axle / Half Shaft
- Driveshaft / Propeller Shaft
- Differential Assembly (front/rear)
- Ring & Pinion Gear
- Limited Slip / Locker Differential
- Universal Joint (U-joint)
- CV Joint / Boot
- Wheel Hub / Hub Assembly

---

### BRAKES
*Sources: All — MarkLines (Brake, Sub-brake, ABS/TCS/ESC), RockAuto (Brake & Wheel Hub), eBay (Brakes & Brake Parts), Pull-A-Part (Brake Pads), 1A Auto (Brakes & Wheel Bearing)*

- Brake Pads (disc)
- Brake Shoes (drum)
- Brake Rotor / Disc
- Brake Drum
- Brake Caliper (front/rear)
- Brake Master Cylinder
- Brake Booster / Vacuum Pump
- Wheel Cylinder (drum)
- Brake Lines / Hoses
- ABS Pump / Modulator
- ABS Sensor / Wheel Speed Sensor
- Parking Brake / EPB Actuator

---

### SUSPENSION
*Sources: MarkLines (Suspension system), RockAuto (Suspension), eBay (Steering & Suspension), Pull-A-Part (Shocks), 1A Auto (Steering & Suspension)*

- Shock Absorber
- Strut Assembly (complete)
- Coil Spring / Leaf Spring / Torsion Bar
- Control Arm (upper/lower)
- Ball Joint
- Sway Bar / Stabilizer Bar + End Links + Bushings
- Strut Mount / Bearing Plate
- Air Suspension Compressor / Air Bags
- Subframe / Crossmember
- Steering Knuckle / Spindle

---

### STEERING
*Sources: MarkLines (Steering system), RockAuto (Steering), eBay (Steering & Suspension), Pull-A-Part (Steering Wheel, Power Steering Pump), 1A Auto (Steering & Suspension)*

- Steering Wheel
- Steering Column
- Steering Rack / Rack & Pinion Assembly
- Power Steering Pump (hydraulic)
- Electric Power Steering (EPS) Motor/Unit
- Power Steering Lines / Reservoir
- Tie Rod / Tie Rod End
- Idler Arm / Pitman Arm
- Steering Angle Sensor

---

### WHEELS_AND_TIRES
*Sources: MarkLines (Tire & wheel), RockAuto (Wheel), eBay (Wheels, Tires & Parts), Pull-A-Part (Tires and Wheels)*

- Steel Wheel / Rim
- Alloy Wheel / Rim
- Tire (used)
- Wheel Center Cap / Hub Cap
- TPMS Sensor (tire pressure monitoring)
- Lug Nuts / Wheel Locks

> **Salvage note:** Tire/wheel combos as a complete set are extremely popular. TPMS sensors are salvage-specific high-demand items.

---

### ELECTRICAL_CHARGING
*Sources: MarkLines (Engine electrical parts), RockAuto (Electrical), eBay (Starters, Alternators, ECUs & Wiring), Pull-A-Part (Starter, Alternator, Car Battery)*

- Starter Motor
- Alternator
- Battery
- Battery Cables / Terminals
- Voltage Regulator

---

### ELECTRICAL_WIRING
*Sources: MarkLines (Electrical/Electronic parts, Wiring), eBay (Starters, Alternators, ECUs & Wiring), Pull-A-Part (Computers and Modules)*

- Wire Harness (engine, body, dash)
- Fuse Box / Junction Box / Power Distribution Center
- Relays
- Switches (window, door, mirror, etc.)

---

### ECU_AND_MODULES
*Sources: MarkLines (ECU section), eBay (Starters, Alternators, ECUs & Wiring), Pull-A-Part (Computers and Modules — their own top-level category)*

- Engine Control Module (ECM/ECU/PCM)
- Transmission Control Module (TCM)
- ABS Control Module
- Airbag / SRS Control Module
- Body Control Module (BCM)
- HVAC Control Module
- Anti-theft / Immobilizer Module
- Keyless Entry / Remote Start Module

> **Salvage note:** Pull-A-Part lists "Computers and Modules" as a standalone top-level category. These are VIN/vehicle-specific and high-value.

---

### SENSORS
*Sources: MarkLines (Sensor section — 30+ individual types), RockAuto (Electrical)*

- Coolant Temperature Sensor
- Throttle Position Sensor (TPS)
- Crankshaft / Camshaft Position Sensor
- Fuel Level Sensor / Sending Unit
- Oil Pressure Sensor
- Yaw Rate / G-Sensor

*(O2, MAF/MAP, ABS wheel speed, and steering angle sensors are listed under their respective system categories above)*

---

### HVAC
*Sources: MarkLines (Climate Control section), RockAuto (Heat & Air Conditioning), eBay (Air Conditioning & Heating), 1A Auto (Heating & Cooling)*

- A/C Compressor
- A/C Condenser
- A/C Evaporator Core
- Receiver/Drier / Accumulator
- Expansion Valve / Orifice Tube
- Blower Motor + Resistor
- Heater Core
- HVAC Control Head / Climate Control Unit
- A/C Hoses / Lines
- Condenser Fan / Auxiliary Fan

---

### BODY_PANELS
*Sources: MarkLines (Body panel/Frame, Body reinforcement), eBay (Exterior Parts & Accessories), RockAuto (Body & Lamp Assembly), 1A Auto (Exterior, Body Parts & Mirrors)*

- Hood
- Front Fender (left/right)
- Rear Quarter Panel
- Trunk Lid / Decklid
- Tailgate (truck/SUV)
- Liftgate / Hatch
- Roof Panel
- Rocker Panel / Sill
- Floor Pan / Firewall
- Bumper Cover / Fascia (front/rear)
- Bumper Reinforcement / Impact Beam
- Spoiler / Lip
- Splash Shield / Mudguard
- Front-End Module (complete nose assembly)

> **Salvage note:** Color-matching used panels from salvage often beats buying new. Front-end modules sold as complete assemblies are common.

---

### DOORS
*Sources: MarkLines (Door section), eBay (Exterior), Car-Part.com (major door category)*

- Complete Door Assembly (front/rear, left/right)
- Door Shell (skin + frame, no glass/trim)
- Door Glass / Window
- Door Hinge
- Door Handle (inside / outside)
- Door Lock Actuator / Latch
- Door Lock Cylinder
- Power Window Regulator
- Window Motor
- Door Weatherstrip / Seal

> **Salvage note:** Doors sold as complete assemblies with all hardware. FL/FR/RL/RR variants make position important in listings.

---

### GLASS
*Sources: MarkLines (Window glass), Car-Part.com (major search category), nationwideautorecycling.com*

- Windshield (front)
- Rear Window / Back Glass
- Door Glass (front/rear, left/right)
- Quarter Glass
- Vent Glass
- Sunroof / Moonroof Glass

> **Salvage note:** OEM glass is a top used-parts category on Car-Part.com. Windshields with integrated rain sensor / camera bracket command premium prices.

---

### LIGHTING
*Sources: MarkLines (Lighting section), eBay (Lighting & Lamps — explicit top-level), RockAuto (Body & Lamp Assembly)*

- Headlight Assembly (halogen / HID / LED)
- Tail Light Assembly
- Fog Light (front/rear)
- Daytime Running Light (DRL)
- Turn Signal Assembly
- Side Marker Light
- Third Brake Light / High-Mount Stop Lamp
- License Plate Light
- Interior Dome / Map Light

> **Salvage note:** eBay separates Lighting as its own top-level category separate from Electrical, reflecting high search volume for lamp assemblies.

---

### MIRRORS
*Sources: MarkLines (Outside mirror), eBay (Exterior), 1A Auto (Side View Mirrors)*

- Side View Mirror Assembly (left/right, powered/heated/blind spot)
- Mirror Glass (replacement element only)
- Mirror Cover / Housing
- Inside / Rearview Mirror

---

### INTERIOR
*Sources: MarkLines (Interior parts — extensive), eBay (Interior Parts & Accessories), RockAuto (Interior), 1A Auto (Interior)*

- Dashboard / Instrument Panel
- Center Console
- Door Panel (interior trim)
- Carpet / Floor Mat
- Headliner
- Sun Visor
- Armrest
- Glove Box
- Pillar Trim / Garnish (A/B/C)
- Steering Column Cover / Shroud
- Rear Parcel Shelf / Package Tray
- Trunk Liner
- Floor Insulator / Sound Deadening

---

### SEATS
*Sources: MarkLines (Interior parts), eBay (Interior Parts), nationwideautorecycling.com*

- Front Seat (driver/passenger, complete)
- Rear Seat (bench or split, complete)
- Seat Cushion / Cover / Upholstery
- Seat Track / Adjuster
- Seat Belt / Retractor / Buckle
- Seat Heater Element

> **Salvage note:** Seats are among the highest-value interior pulls. Leather/cloth distinction and color matching drive demand.

---

### AIRBAGS
*Sources: MarkLines (Airbag section — 10+ subcategories), eBay (Interior Parts)*

- Driver Airbag (steering wheel)
- Passenger Airbag (dash)
- Side Curtain Airbag (roof rail)
- Side Seat Airbag
- Knee Airbag
- Seat Belt Pretensioner
- Airbag Clock Spring / Spiral Cable

> **Salvage note:** Deployed airbags have zero resale value. Undeployed sets are high-value. The condition field should include a deployed/undeployed flag for this category.

---

### INSTRUMENT_CLUSTER
*Sources: MarkLines (Instrument panel, Display section), Pull-A-Part (implied), nationwideautorecycling.com (Speedometers)*

- Instrument Cluster (complete)
- Speedometer / Tachometer (individual gauges)
- Fuel / Temperature Gauge
- Head-Up Display (HUD)

> **Salvage note:** Mileage on used clusters is a legal/disclosure issue in several US states — may need a mandatory disclosure field.

---

### AUDIO_AND_INFOTAINMENT
*Sources: MarkLines (Entertainment/Audio, Telematics/Car navigation), eBay (Interior Parts & Accessories)*

- Radio / Head Unit (single DIN, double DIN)
- Navigation System / Touchscreen Display
- Amplifier
- Speakers / Subwoofer
- Antenna (AM/FM, satellite, shark fin)
- Backup Camera
- GPS / Telematics Control Unit (TCU)

---

### BELT_DRIVE
*Sources: RockAuto (Belt Drive — explicit top-level), MarkLines (V belt, serpentine, timing), Pull-A-Part (Serpentine Belt)*

- Serpentine Belt
- Timing Belt / Chain Kit (belt + tensioner + pulleys)
- Drive Belt (individual accessory belts)
- Belt Tensioner / Idler Pulley

---

### WIPERS
*Sources: RockAuto (Wiper & Washer — explicit top-level), MarkLines (Wiper, Window washer)*

- Wiper Arms / Blades
- Wiper Motor (front/rear)
- Wiper Linkage
- Washer Pump / Reservoir / Nozzles

---

### SUNROOF
*Sources: MarkLines (Sunroof section), eBay (Exterior)*

- Sunroof / Moonroof Assembly (complete)
- Sunroof Glass
- Sunroof Motor / Regulator / Track
- Drain Tubes / Seals

---

### TOWING
*Sources: eBay (Towing Parts & Accessories — explicit top-level category)*

- Trailer Hitch Receiver
- Wiring Harness (trailer / 4-pin / 7-pin)
- Ball Mount / Hitch Ball
- Running Boards / Step Bars
- Roof Rack / Cargo Carrier
- Truck Bed Liner / Tonneau Cover

---

### EV_AND_HYBRID
*Sources: MarkLines (Electric Powertrain — entire first main category), eBay (Electric, Hybrid & PHEV Specific Parts — explicit top-level)*

- High-Voltage Battery Pack / Module / Cell
- Drive Motor / e-Axle
- Inverter / Power Control Unit (PCU)
- DC-DC Converter
- Onboard Charger (OBC)
- Battery Management System (BMS) Module
- Charging Port / Inlet
- PTC Heater
- EV Thermal Management Components
- Hybrid Transaxle

> **Emerging note:** eBay already lists this as a standalone top-level category. Most salvage yards are not yet organized for HV battery handling but will need to be.

---

### ADAS
*Sources: MarkLines (AD/ADAS section — full top-level main category)*

- Radar Sensor (front/rear/side — ACC, AEB, BSM)
- Forward-Facing Camera (lane keep, AEB)
- Surround View / Parking Camera
- LiDAR
- Lane Keeping / Departure Warning Module
- Adaptive Cruise Control Module

> **Emerging note:** High-value parts from late-model vehicles. Growing salvage category as 2018+ vehicles enter the used market.

---

### HARDWARE
*Sources: RockAuto (Hardware — explicit top-level), MarkLines (Fastener/Connector)*

- Bolts / Nuts / Studs / Wheel Bolts
- Clips / Retainers / Push-Pins
- Body Plugs / Grommets
- Brackets / Mounting Hardware
- Hinges / Latches (non-door)

---

## Gap Analysis vs. Previous Implementation

The original implementation used free-text `partType` with ad-hoc values like `"engine"`, `"headlight"`, `"door"`. The seed data used `BRAKES`, `ELECTRICAL`, `BODY`.

Key gaps identified:
- No distinction between `ELECTRICAL_CHARGING` (starter/alternator) and `ELECTRICAL_WIRING` (harnesses/fuses) — eBay separates these for good reason
- `ECU_AND_MODULES` missing entirely — Pull-A-Part's own top-level category
- `TRANSMISSION`, `DRIVETRAIN`, `SUSPENSION`, `STEERING` not in any enum
- `DOORS` and `GLASS` missing — major categories on Car-Part.com
- `HVAC` missing
- `INTERIOR`, `SEATS`, `AIRBAGS` missing — high-value salvage items
- No `EV_AND_HYBRID` or `ADAS` for late-model vehicles
