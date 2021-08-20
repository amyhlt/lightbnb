const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});
pool.connect()
  .then(() => {
    console.log('db connected!');
  })
  .catch(err => console.error('db connection error', err.stack));// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  const queryString = `SELECT * from users where email=$1`
  //const values=[email];
  return pool
    .query(queryString, [email])
    .then(res => res.rows[0])
    .catch((err) => err.message);

}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  const queryString = `SELECT * from users where id=$1`
  return pool
    .query(queryString, [id])
    .then(res => res.rows[0])
    .catch((err) => err.message);
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
`;
  const values = [user.name, user.email, user.password];
  return pool
    .query(queryString, values)
    .then(res => res.rows[0])
    .catch((err) => err.message);
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = ` 
  SELECT properties.*,reservations.*,avg(property_reviews.rating) AS average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id
   WHERE reservations.guest_id = $1 AND end_date < now()::date
   GROUP BY properties.id, reservations.id
   ORDER BY reservations.start_date
   LIMIT $2;`
  const values = [guest_id, limit];
  return pool
    .query(queryString, values)
    .then(res => res.rows)
    .catch(err => console.log(err.stack));
}
exports.getAllReservations = getAllReservations;

/// Properties
/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_reviews.property_id
  `;
  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    if (queryParams.length > 1) {
      queryString += `AND city LIKE $${queryParams.length} `;
    } else {
      queryString += `WHERE city LIKE $${queryParams.length} `;
    }
  }
  if (options.owner_id) {
    queryParams.push(`${options.owner_id}`);
    if (queryParams.length > 1) {
      queryString += `AND properties.owner_id = $${queryParams.length} `;
    } else {
      queryString += `WHERE properties.owner_id = $${queryParams.length} `;
    }
  }
  if (options.minimum_price_per_night) {
    queryParams.push(`${options.minimum_price_per_night * 100}`);
    if (queryParams.length > 1) {
      queryString += `and properties.cost_per_night >= $${queryParams.length} `;
    } else {
      queryString += `WHERE properties.cost_per_night >= $${queryParams.length} `;
    }
  }
  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    if (queryParams.length > 1) {
      queryString += `and properties.cost_per_night  <= $${queryParams.length} `;
    } else {
      queryString += `WHERE properties.cost_per_night  <= $${queryParams.length} `;
    }
  }
  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += `
      GROUP BY properties.id
      HAVING avg(property_reviews.rating) >= $${queryParams.length}`;
    queryParams.push(limit);
    queryString += `
      ORDER BY cost_per_night
      LIMIT $${queryParams.length};
      `;
  } else {
    queryParams.push(limit);
    queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  }
 console.log(queryString, queryParams);
  return pool.query(queryString, queryParams).then((res) => res.rows)
    .catch((err) => {
      console.log(err.message);
    });
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  const queryString = `
  INSERT INTO properties (
    owner_id,
    title,
    description,
    thumbnail_photo_url,
    cover_photo_url,
    cost_per_night,
    parking_spaces,
    number_of_bathrooms,
    number_of_bedrooms,
    country,
    street,
    city,
    province,
    post_code,
    active)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
  RETURNING *;
`;
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night * 100,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.country,
    property.street,
    property.city,
    property.province,
    property.post_code,
    true
  ];
  return pool
    .query(queryString, values)
    .then(resp => resp.rows[0])
    .catch((err) => err.message);
}
exports.addProperty = addProperty;
