const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({ path: "reviews", populate: { path: "author", }, }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res, next) => {
    try {
        let response = await geocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 1
        }).send();

        let url = req.file.path;
        let filename = req.file.filename;

        const { listing } = req.body;
        const newListing = new Listing({
            ...listing,
            image: {
                filename: listing.image?.filename || "listingimage",
                url: listing.image?.url || "https://images.unsplash.com/photo-1625505826533-5c80aca7d157?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGdvYXxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60"
            },
            geometry: {
                type: response.body.features[0].geometry.type, // Ensure 'type' is included
                coordinates: response.body.features[0].geometry.coordinates // Ensure 'coordinates' is included
            }
        });

        newListing.owner = req.user._id;
        newListing.image = { url, filename };

        let savedListing = await newListing.save();
        console.log(savedListing);

        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    } catch (error) {
        next(error);
    }
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    const listingData = req.body.listing;

    try {
        // Find the existing listing
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash("error", "Listing not found!");
            return res.redirect("/listings");
        }

        // Update listing fields
        listing.title = listingData.title;
        listing.description = listingData.description;
        listing.price = listingData.price;
        listing.location = listingData.location;
        listing.country = listingData.country;

        // Handle image update
        if (req.file) {
            const url = req.file.path;
            const filename = req.file.filename;
            listing.image = { url, filename };
        } else {
            // Ensure the image field is structured correctly even if not updating
            listing.image = listing.image || {};
            listing.image.url = listingData.image?.url || listing.image.url;
            listing.image.filename = listing.image.filename || "defaultFilename";
        }

        // Save the updated listing
        await listing.save();

        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Something went wrong!");
        res.redirect("/listings");
    }
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};