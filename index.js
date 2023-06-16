const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.port || 3000;


// middleware

app.use(cors());
app.use(express.json());


// jwt verify
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' });
    }
    // bearer token
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

// database connect


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lxtvnq3.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const usersCollection = client.db("skillSetDb").collection("users");
        const classCollection = client.db('skillSetDb').collection('class');
        const cartCollection = client.db('skillSetDb').collection('carts');
        const paymentCollection = client.db('skillSetDb').collection('payments');


        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        })

        // users get

        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        // user admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })


        //   user instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })
        // users insert

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }

            const result = await usersCollection.insertOne(user);
            res.send(result);
        });



        // set as admin

        // 
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        // set as instructor

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };

            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        // instructor get
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })


        //// get class  
        app.get('/class', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })

        // clas id test
        app.get('/classed/:id', async (req, res) => {
            const id = req.params.id;
            const classQuery = { _id: new ObjectId(id)   }
                // const approveClass = await classCollection.find(query).toArray;
                const result= await classCollection.findOne(classQuery);
            res.send(result);
        })

        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const updateClass = req.body;
            // console.log(id, toy);

            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedClassDoc = {
                $set: {
                    price: updateClass.price,
                   
                    availableSeats: updateClass.availableSeats,
                    className: updateClass.className
                }
            }

            const result = await classCollection.updateOne(filter, updatedClassDoc, options);
            res.send(result);

        })


        // class id test
        //  add class

        app.post('/class', async (req, res) => {
            const newItem = req.body;
            const result = await classCollection.insertOne(newItem)
            res.send(result);
        })

        // admin approve deny


        app.patch('/class/approve/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approve'
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);

        })

        app.patch('/class/deny/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'deny'
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);



        })



        // get approve class

        app.get('/class/approve', async (req, res) => {


            const query = { status: 'approve' }
            // const approveClass = await classCollection.find(query).toArray;
            const approveClasses = await classCollection.find(query).toArray();

            res.send(approveClasses);
        })


        // get enroll class with 6 data
      
        app.get('/class/enrollSix', async (req, res) => {
            try {
              const topClasses = await classCollection
                .aggregate([
                    { $match: { status: 'approve' } }, // Filter documents with status 'approve'
                    { $sort: { enroll: -1 } }, // Sort by enroll field in descending order
                    { $limit: 6 }, // Limit the result to 6 documents
                ])
                .toArray();
          
              res.send(topClasses);
            } catch (error) {
              console.error(error);
              res.status(500).send('Internal Server Error');
            }
          });
          

        // 

        // enroll six instructor
        app.get('/class/instructorSix', async (req, res) => {
            try {
              const topClasses = await usersCollection
                .aggregate([
                    { $match: { role: 'instructor' } }, // Filter documents with status 'approve'
                    { $limit: 6 }, // Limit the result to 6 documents
                ])
                .toArray();
          
              res.send(topClasses);
            } catch (error) {
              console.error(error);
              res.status(500).send('Internal Server Error');
            }
          });

        //   get all instructor
        app.get('/class/instructorGetAll', async (req, res) => {
            try {
                const query = { role: 'instructor' }
              const instructor = await usersCollection.find(query).toArray();
          
              res.send(instructor);
            } catch (error) {
              console.error(error);
              res.status(500).send('Internal Server Error');
            }
          });


        // 

        app.get('/class/deny', async (req, res) => {


            const query = { status: 'deny' }
            // const approveClass = await classCollection.find(query).toArray;
            const approveClasses = await classCollection.find(query).toArray();

            res.send(approveClasses);
        })

        //   test============================

        app.patch('/class/:id', async (req, res) => {
            const id = req.params.id;
            const { feedback } = req.body;
            console.log(id);
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    feedback: feedback
                },
            };

            const result = await classCollection.updateOne(filter, updateDoc);
            res.send(result);



        })


        // test======================


        // test



        //  get & post & delete cart
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([]);
            }


            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });



        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(item);

            const result = await cartCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const result = await cartCollection.deleteOne(query);

            res.send(result);
        })

        // test
        // app.get('/class/approve/:id', async (req, res) => {
        //     const id = req.params.id;

        //     const classQuery = { _id: new ObjectId(id)   }
        //     // const approveClass = await classCollection.find(query).toArray;
        //     const classSelected= await classCollection.findOne(classQuery);
        //     const cartQuery = {selectId: id}
        //     // const approveClass = await classCollection.find(query).toArray;
        //     const cartSelected= await cartCollection.find(classQuery).toArray();

        //     const selected = cartQuery === classQuery;
        //     console.log(selected, cartQuery, classQuery );


        //     res.send(selected);
        //   })


        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;

            // const query = { _id: new ObjectId(id)  }
            const query = { selectId: id }
            // const approveClass = await classCollection.find(query).toArray;
            const selected = await cartCollection.find(query).toArray();

            res.send(selected);
        })

        app.get('/selectedCard', async (req, res) => {
            const result = await cartCollection.find().toArray();
            res.send(result);
        })
        app.get('/selectedCard/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }

            const selected = await cartCollection.find(query).toArray();

            res.send(selected);
        })

        // 
        app.get('/class/:email', async (req, res) => {
            const email = req.params.email;

            const query = { instructorEmail: email }

            const selected = await classCollection.find(query).toArray();

            res.send(selected);
        })

        //


        app.get('/selectedCard/:id', async (req, res) => {
            const id = req.params.id;

            const query = { selectId: id }

            const selected = await cartCollection.find(query).toArray();

            res.send(selected);
        })

       

        app.get('/cartspay/:id', async (req, res) => {
            const id = req.params.id;

            // const query = { _id: new ObjectId(id) }
            const query = { selectId: id }
            // const approveClass = await classCollection.find(query).toArray;
            const selected = await cartCollection.find(query).toArray();

            res.send(selected);
        })
       

        // create payment intend
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            // console.log(price, amount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        // /payment related api

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);
            // delete query
            const deleteQuery = { _id: new ObjectId(payment.cartId) };
            // console.log(deleteQuery);
            const deleteResult = await cartCollection.deleteOne(deleteQuery);
            // update query single data
            const filter = { _id: new ObjectId(payment.selectId) };
            const numberOfSeats = parseFloat(payment.availableSeats);
            const remainingSeats = parseFloat(numberOfSeats - 1);
            const enrollQuery = { _id: new ObjectId(payment.selectId) };
            const enrollPrevious = await classCollection.findOne(enrollQuery);
            console.log('enroll previous:', enrollPrevious.enroll);
            const presentEnroll = parseFloat(enrollPrevious.enroll + 1);
            const updateClassAvailableSeats = {
                $set: {

                    availableSeats: remainingSeats,
                    enroll: presentEnroll
                },
            };
            const updateResult = await classCollection.updateOne(filter, updateClassAvailableSeats);

            // result send to res.send
            res.send({ insertResult, deleteResult, updateClassAvailableSeats });
        })



        app.get('/payments/:selectId', async (req, res) => {
            const id = req.params.selectId;

            const query = { selectId: id }

            const selected = await paymentCollection.find(query).toArray();


            res.send(selected);
        })


        
        app.get('/payment/:email', async (req, res) => {
            const id = req.params.email;

            const query = { email: id }

            const selected = await paymentCollection.find(query).toArray();


            res.send(selected);
        })
        
        // test
        app.get('/paymenthistory/:email', async (req, res) => {
            const id = req.params.email;
            const query = { email: id };
          
            const selected = await paymentCollection.find(query).sort({ date: -1 }).toArray();
              // Sort by timestamp in descending order (-1)
          
            res.send(selected);
          });

        // test

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('skillSet server running')
})

app.listen(port, () => {
    console.log(`SkillSet Academy is running on port ${port}`);
})



// git add .
//  git commit -m" "
//  git push origin main