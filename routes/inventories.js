var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
let inventoryModel = require('../schemas/inventories');

const productPopulate = {
  path: 'product',
  match: {
    isDeleted: false
  },
  populate: {
    path: 'category',
    select: 'name slug'
  }
};

function getValidQuantity(req, res) {
  let { product, quantity } = req.body;
  let parsedQuantity = Number(quantity);

  if (!product || !mongoose.isValidObjectId(product)) {
    res.status(400).send({ message: 'product khong hop le' });
    return null;
  }

  if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
    res.status(400).send({ message: 'quantity phai la so nguyen duong' });
    return null;
  }

  return {
    product,
    quantity: parsedQuantity
  };
}

async function getInventoryResponse(productId) {
  return await inventoryModel.findOne({
    product: productId
  }).populate(productPopulate);
}

async function updateInventoryByProduct(productId, condition, update, insufficientMessage) {
  let updatedInventory = await inventoryModel.findOneAndUpdate(
    {
      product: productId,
      ...condition
    },
    {
      $inc: update
    },
    {
      new: true
    }
  ).populate(productPopulate);

  if (updatedInventory) {
    return {
      status: 200,
      data: updatedInventory
    };
  }

  let currentInventory = await inventoryModel.findOne({
    product: productId
  });

  if (!currentInventory) {
    return {
      status: 404,
      message: 'inventory khong ton tai'
    };
  }

  return {
    status: 400,
    message: insufficientMessage
  };
}

router.get('/', async function (req, res, next) {
  try {
    let result = await inventoryModel.find({}).populate(productPopulate);
    res.send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get('/:id', async function (req, res, next) {
  try {
    let result = await inventoryModel.findById(req.params.id).populate(productPopulate);
    if (!result) {
      return res.status(404).send({ message: 'ID NOT FOUND' });
    }
    res.send(result);
  } catch (error) {
    res.status(404).send({ message: error.message });
  }
});

router.post('/add-stock', async function (req, res, next) {
  try {
    let payload = getValidQuantity(req, res);
    if (!payload) {
      return;
    }

    await inventoryModel.findOneAndUpdate(
      { product: payload.product },
      {
        $inc: {
          stock: payload.quantity
        }
      },
      {
        new: true
      }
    );

    let result = await getInventoryResponse(payload.product);
    if (!result) {
      return res.status(404).send({ message: 'inventory khong ton tai' });
    }

    res.send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post('/remove-stock', async function (req, res, next) {
  try {
    let payload = getValidQuantity(req, res);
    if (!payload) {
      return;
    }

    let result = await updateInventoryByProduct(
      payload.product,
      { stock: { $gte: payload.quantity } },
      { stock: -payload.quantity },
      'stock khong du de giam'
    );

    res.status(result.status).send(result.data || { message: result.message });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post('/reservation', async function (req, res, next) {
  try {
    let payload = getValidQuantity(req, res);
    if (!payload) {
      return;
    }

    let result = await updateInventoryByProduct(
      payload.product,
      { stock: { $gte: payload.quantity } },
      {
        stock: -payload.quantity,
        reserved: payload.quantity
      },
      'stock khong du de reserve'
    );

    res.status(result.status).send(result.data || { message: result.message });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.post('/sold', async function (req, res, next) {
  try {
    let payload = getValidQuantity(req, res);
    if (!payload) {
      return;
    }

    let result = await updateInventoryByProduct(
      payload.product,
      { reserved: { $gte: payload.quantity } },
      {
        reserved: -payload.quantity,
        soldCount: payload.quantity
      },
      'reserved khong du de ban'
    );

    res.status(result.status).send(result.data || { message: result.message });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

module.exports = router;
