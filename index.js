const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()
const cors = require('cors');
app.use(cors())
app.use(express.json());
require('dotenv').config()

const port = process.env.PORT || 5000;








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.fhipq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () => {
    await client.connect();
    const urlCollectionsDb = client.db('UrlCollections').collection('urlBody');

    const urlCollections = await urlCollectionsDb.find({}).toArray();

    app.get("/", (req, res) => {
        shortUrlId()
        res.send('access denied');
    })

    // get id and return 
    app.get('/url/:shortID', async (req, res) => {
        const { shortID } = req.params;
        const findUrl = await urlCollectionsDb.findOne({ url_short_form: shortID })
        res.send(findUrl?.url)
    })

    app.get('/url-custom/:editId', async (req, res) => {
        const editableId = req.params.editId;
        const result = await urlCollectionsDb.findOne({ editableId: editableId })
        res.send(result);
    })

    // find secretId by email;
    app.post('/find-url/:shortener', async (req, res) => {
        const email = req.query.email;
        const shortener = req.params.shortener;
        const query = { email: email };
        const find = await urlCollectionsDb.findOne(query);
        if (find?.url_short_form === shortener) {
           
            res.send({ location: find?.editableId })
        }
        else {
            res.send({ location: '' })
        }
    })

    const shortUrlId = async (length) => {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));

        }
        const urlShortId = urlCollections.map(urlShotId => urlShotId.url_short_form);

        if (!urlShortId.includes(result)) {
            return result;
        }
        else {
            return shortUrlId();
        }
    }

    // post url 
    app.post('/set-url', async (req, res) => {
        const urlData = req.body;
        const { secretId } = urlData;
        let editableId;
        const date = new Date();
        if (!secretId) {
            editableId = await shortUrlId(6);
        }
        else {
            editableId = secretId;
        }

        const getShortId = await shortUrlId(5);
        const { url, email } = urlData;
        editableId = getShortId + '-' + editableId
        const newUrl = {
            url: url,
            email: email,
            editableId: editableId,
            url_short_form: getShortId
        }


        const data = await urlCollectionsDb.insertOne(newUrl);
        res.send({ data, editableId })
    })
    app.put('/update-url', async (req, res) => {
        let errMsg = 'successfully update';
        let update = true
        const { id } = req.query;
        const body = req.body;
        console.log(body)
        const query = { _id: ObjectId(id) }
        const findUrl = await urlCollectionsDb.findOne(query);
        findUrl.url = body.url;
        findUrl.email = body.email;

        const updateShortFormId = body.url_short_form?.trim();


        if (updateShortFormId?.length === 5 || updateShortFormId?.length === 6) {
            const mappingShortForm = await urlCollections.map(urlId => urlId.url_short_form);
            if (mappingShortForm.includes(updateShortFormId)) {
                errMsg = 'Already have this shortener'
                update = false
                findUrl.editableId = findUrl.url_short_form + '-' + findUrl.editableId.split('-')[1]
            }
            else {
                findUrl.url_short_form = updateShortFormId;
                findUrl.editableId = updateShortFormId + '-' + findUrl.editableId.split('-')[1]
            }
        }
        const secretId = body?.editableId?.trim();
        if (secretId?.length >= 6 && secretId?.length <= 10) {

            findUrl.editableId = findUrl.url_short_form + '-' + secretId;
        }
        else {
            findUrl.editableId = findUrl.url_short_form + '-' + findUrl.editableId.split('-')[1]
        }
        const updateDoc = {
            $set: findUrl
        }
        const result = await urlCollectionsDb.updateOne(query, updateDoc);
        res.send({ message: errMsg, update, result, location: findUrl.editableId })
    })
}
run().catch(console.dir)





app.listen(port, () => {
    console.log('successfully running')
})
