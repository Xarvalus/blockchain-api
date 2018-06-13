import { Connection, Transaction } from 'bigchaindb-driver'
import User from '../models/User'

// @TODO should be typed from lib and imported in .flowconfig
declare var bigchaindb: Connection;

type CreateTransactionForm = { asset?: Object, metadata?: Object }
type TransferTransactionForm = { txCreatedId?: string, metadata?: Object }

const USER_1 = 'Alice'
const USER_2 = 'Bob'

/**
 * Get list of transactions with assets
 */
exports.getTransactions = () => {
  // @TODO return list of transactions with assets and identifier possible to use in postTransferTransaction
}

/**
 * Create new asset in blockchain
 *
 * @param req
 * @param res
 * @param next
 */
exports.postCreateTransaction = async (req: express$Request, res: express$Response, next: express$NextFunction): mixed => {
  try {
    const { asset, metadata }: CreateTransactionForm = req.body

    // access currently authorized user's public/private keys
    const userKeys = await new User().userKeys(USER_1)

    const txCreate = Transaction.makeCreateTransaction(
      asset,
      metadata,
      [
        Transaction.makeOutput( // eslint-disable-line function-paren-newline
          Transaction.makeEd25519Condition(userKeys.publicKey))
      ],
      userKeys.publicKey,
    )

    const txSigned = Transaction.signTransaction(txCreate, userKeys.privateKey)
    await bigchaindb.postTransaction(txSigned)

    res.status(204).send() // successfully proceeded
  } catch (e) {
    next(e)
  }
}

/**
 * Transfer the asset in blockchain from current owner to another
 *
 * @param req
 * @param res
 * @param next
 */
exports.postTransferTransaction = async (req: express$Request, res: express$Response, next: express$NextFunction): mixed => {
  try {
    const { txCreatedId, metadata }: TransferTransactionForm = req.body

    // access currently authorized users' public/private keys
    const currentOwnerKeys = await new User().userKeys(USER_1)
    const newOwnerKeys = await new User().userKeys(USER_2)

    const txCreated = await bigchaindb.getTransaction(txCreatedId)

    const createTransfer = Transaction.makeTransferTransaction(
      [{ txCreated, output_index: 0 }],
      [
        Transaction.makeOutput( // eslint-disable-line function-paren-newline
          Transaction.makeEd25519Condition(currentOwnerKeys.publicKey))
      ],
      currentOwnerKeys.publicKey,
      metadata,
    )

    // Sign with the key of the new owner of the painting
    const signedTransfer = Transaction
      .signTransaction(createTransfer, newOwnerKeys.privateKey)
    await bigchaindb.postTransaction(signedTransfer)

    res.status(204).send() // successfully proceeded
  } catch (e) {
    next(e)
  }
}

/**
 * Return asset details
 */
exports.getAsset = () => {
  // ...
}
