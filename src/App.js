import { useRef, useEffect, useState } from 'react'
import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'
import "./App.css"
import '@tomtom-international/web-sdk-maps/dist/maps.css'



const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({}) //set the map as map so that we can use it
  const [longitude, setLongitude] = useState(-0.112869) //set the initial location of the delivery boy as constt
  const [latitude, setLatitude] = useState(51.504)

  // const longitude = 78.8718
  //justify longitude of India
  // const latitude = 21.7679
  //justify latitude of India

  // add two pointers to mark
  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }
  
  //draw the route
  const drawRoute = (geoJson, map) => {
    if(map.getLayer('route')) {
      map.removelayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line', 
      source:{
        type: 'geojson', 
        data: geoJson
      }, 
      paint:{
        'line-color': 'red',
        'line-width': 6
      }
    })
  }



  // function to add delivery markers (red ones)
  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
      .setLngLat(lngLat)
      .addTo(map)
  }


  const destinations = []

  //useffect to get the API key functioning
  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }

    const destinations = []


    let map = tt.map({
      key: process.env.REACT_APP_TOM_TOM_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        //adding traffic incidents and traffic flow for better routes
        trafficIncidents: true,
        trafficFlow: true
      },
      center: [longitude, latitude],
      zoom: 12
    })
  
    setMap(map) //add the map

    //add a marker tp show us where we are
    const addMarker = () => {

      const popupOffset = {
        bottom: [0, -25] //postion of the popup wrt the delivery icon for clarity of posn
      }
      const popup = new tt.Popup({ offest: popupOffset }).setHTML('This is you!')
      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude]) //Comes w the API (specific to it). Set the posn of the marker
        .addTo(map) //add to the map

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLatitude(lngLat.lng)
        setLatitude(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()
    }
    addMarker()


    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)

      })
      const callParameters = {
        key: process.env.REACT_APP_TOM_TOM_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }

      return new Promise(( resolve, reject) => {
        ttapi.services
        .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0];
            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingtime: result.response.routeSummary.travelTimeInSeconds,
              }
            })
            //sort results by driving time to calculate shortest route
            resultsArray.sort((a, b) => {
              return a.drivingtime - b.drivingtime
            })
            const sortedLocations = resultsArray.map((result) => {
              return result.location
            })
            resolve(sortedLocations)

          })
      })

    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
        .calculateRoute({
          key: process.env.REACT_APP_TOM_TOM_API_KEY,
          locations: sorted, 

        })
        .then((routeData) => {
         const geoJson= routeData.toGeoJson()
         drawRoute(geoJson, map)
        })
      })
    }


    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDeliveryMarker(e.lngLat, map)
      recalculateRoutes()
    })


    return () => map.remove() //removed that extra map beneath the first one that was automatically generated via the API call


  }, [longitude, latitude]) //put longitude and latitude as dependencies
  return (
    <>
      {map && <div className="app">
        {/* put the mop here fo it to show up */}
        <h1 className = "heading-top">Distance Matrix routing</h1>
          <h2 className = "heading-top-next">Routes simplified</h2>
        <div ref={mapElement} className="map"></div>
        <div className="search-bar">
          <h1>Where to?</h1>
          <input
            type="text"
            id="longitude"
            className="longitude"
            placeholder="Put in Longitude"
            onChange={(e) => { setLongitude(e.target.value) }} //if anything in here chnages at all
          />
          <input
            type="text"
            id="latitude"
            className="latitude"
            placeholder="Put in Latitude"
            onChange={(e) => { setLatitude(e.target.value) }} //if anything in here chnages at all
          />
        </div>
      </div>}
    </> //empty wrapping element
  )
}

export default App;
